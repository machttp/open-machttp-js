#
# Create an image to run MacHTTP-js
#
# Run: docker run -v /Users/somebody:/home -v /Users/somebody/Sites:/Sites -p 3000:3000 --name machttp-js -d machttp-js
#
# This image expects three arguments:
#	volume /home - maps to the local directory on your host that will persist the MacHTTP-js.odb settings file
#	volume /Sites - maps to the local directory on your host that holds the web site content
#   port - the external port and corresponding internal port that docker will expose to public users
#
# Once running, visit http://localhost:3000/_static/admin/settings.jhtml to configure basic server settings,
# then stop and restart the docker container.

FROM node:wheezy

ENV HOME /home
ADD . /project
RUN rm -rf /project/node_modules
WORKDIR /project
RUN cd /project && npm install

EXPOSE 3000
CMD ["npm", "run", "linux"]